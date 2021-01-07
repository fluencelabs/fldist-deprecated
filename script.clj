(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (provider "register")
        [%init_peer_id%])
  (seq
   (call relay (provider "get_status")
         [] status)
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
