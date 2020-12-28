(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (provider "register")
        ["12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB"])
  (seq
   (call relay (provider "get_status")
         ["12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB"] status)
   (seq
    (call %init_peer_id% (returnService "") [status])
    (seq
     (call relay ("op" "identity") [])
     (seq
      (call relay (verifier "set_tetraplet")
            [relay provider "get_status" json_path])
      (seq
       (call relay (verifier "is_authorized") [status.$.["is_registered"]] res)
       (call %init_peer_id% (returnService "") [status.$.["is_registered"] res]))))))))
