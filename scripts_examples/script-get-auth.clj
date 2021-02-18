(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (userlist "is_authenticated")
        [] auth_result)
  (call %init_peer_id% (returnService "run") [auth_result])
     ))
